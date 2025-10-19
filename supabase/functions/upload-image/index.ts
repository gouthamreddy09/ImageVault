import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")?.trim();
    const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")?.trim();
    const AWS_REGION = Deno.env.get("AWS_REGION")?.trim() || "us-east-1";
    const S3_BUCKET_NAME = Deno.env.get("S3_BUCKET_NAME")?.trim();

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET_NAME) {
      return new Response(
        JSON.stringify({ error: "AWS credentials not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME environment variables." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No image file provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedName}`;

    const url = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileName}`;

    const encoder = new TextEncoder();
    const contentType = file.type || "application/octet-stream";

    const fileHashBuffer = await crypto.subtle.digest("SHA-256", new Uint8Array(fileBuffer));
    const fileHash = Array.from(new Uint8Array(fileHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const canonicalUri = `/${fileName}`;
    const canonicalQueryString = '';
    const canonicalHeaders = `content-type:${contentType}\nhost:${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com\nx-amz-content-sha256:${fileHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${fileHash}`;

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${AWS_REGION}/s3/aws4_request`;
    const canonicalRequestHash = Array.from(new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest))
    )).map(b => b.toString(16).padStart(2, '0')).join('');
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

    async function hmac(key: Uint8Array | CryptoKey, message: string): Promise<Uint8Array> {
      const cryptoKey = key instanceof Uint8Array
        ? await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
        : key;
      const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
      return new Uint8Array(signature);
    }

    const kDate = await hmac(encoder.encode(`AWS4${AWS_SECRET_ACCESS_KEY}`), dateStamp);
    const kRegion = await hmac(kDate, AWS_REGION);
    const kService = await hmac(kRegion, 's3');
    const kSigning = await hmac(kService, 'aws4_request');
    const signature = await hmac(kSigning, stringToSign);
    const signatureHex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');

    const authorizationHeader = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;

    const s3Response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": fileHash,
        "Authorization": authorizationHeader,
      },
      body: fileBuffer,
    });

    if (!s3Response.ok) {
      const errorText = await s3Response.text();
      console.error("S3 upload failed:", s3Response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to upload to S3",
          status: s3Response.status,
          details: errorText
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tags = file.name
      .replace(/\.[^/.]+$/, "")
      .split(/[-_\s]+/)
      .filter((tag) => tag.length > 0)
      .map((tag) => tag.toLowerCase());

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: imageData, error: dbError } = await supabase
      .from("images")
      .insert({
        filename: file.name,
        url: url,
        tags: tags,
        user_id: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save image metadata", details: dbError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    try {
      const aiTagsResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-tags`,
        {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl: url }),
        }
      );

      if (aiTagsResponse.ok) {
        const { tags: aiTags } = await aiTagsResponse.json();
        if (aiTags && aiTags.length > 0) {
          const combinedTags = [...new Set([...tags, ...aiTags])];
          await supabase
            .from("images")
            .update({ tags: combinedTags })
            .eq("id", imageData.id);

          imageData.tags = combinedTags;
        }
      }
    } catch (aiError) {
      console.error("AI tagging error (non-critical):", aiError);
    }

    return new Response(
      JSON.stringify({ message: "Upload successful", url: url, data: imageData }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});