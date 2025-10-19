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
    const { imageId, newFilename } = await req.json();

    if (!imageId || !newFilename) {
      return new Response(
        JSON.stringify({ error: "Missing imageId or newFilename" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    const { data: image, error: fetchError } = await supabase
      .from("images")
      .select("*")
      .eq("id", imageId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !image) {
      return new Response(
        JSON.stringify({ error: "Image not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")?.trim();
    const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")?.trim();
    const AWS_REGION = Deno.env.get("AWS_REGION")?.trim() || "us-east-1";
    const S3_BUCKET_NAME = Deno.env.get("S3_BUCKET_NAME")?.trim();

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET_NAME) {
      return new Response(
        JSON.stringify({ error: "AWS credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const oldKey = image.url.split('.com/')[1];
    const timestamp = Date.now();
    const newKey = `${timestamp}-${newFilename}`;
    const newUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${newKey}`;

    const encoder = new TextEncoder();
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = 'UNSIGNED-PAYLOAD';

    async function hmac(key: Uint8Array | CryptoKey, message: string): Promise<Uint8Array> {
      const cryptoKey = key instanceof Uint8Array
        ? await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
        : key;
      const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
      return new Uint8Array(signature);
    }

    async function getSignature(method: string, key: string, headers: Record<string, string>) {
      const canonicalUri = `/${key}`;
      const canonicalQueryString = '';
      const canonicalHeaders = Object.entries(headers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k.toLowerCase()}:${v}`)
        .join('\n') + '\n';
      const signedHeaders = Object.keys(headers)
        .map(k => k.toLowerCase())
        .sort()
        .join(';');
      const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

      const algorithm = 'AWS4-HMAC-SHA256';
      const credentialScope = `${dateStamp}/${AWS_REGION}/s3/aws4_request`;
      const canonicalRequestHash = Array.from(new Uint8Array(
        await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest))
      )).map(b => b.toString(16).padStart(2, '0')).join('');
      const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

      const kDate = await hmac(encoder.encode(`AWS4${AWS_SECRET_ACCESS_KEY}`), dateStamp);
      const kRegion = await hmac(kDate, AWS_REGION);
      const kService = await hmac(kRegion, 's3');
      const kSigning = await hmac(kService, 'aws4_request');
      const signature = await hmac(kSigning, stringToSign);
      const signatureHex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');

      return {
        authorization: `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`,
        signedHeaders
      };
    }

    const copyHeaders = {
      'host': `${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`,
      'x-amz-copy-source': `/${S3_BUCKET_NAME}/${oldKey}`,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    };
    const { authorization: copyAuth } = await getSignature('PUT', newKey, copyHeaders);

    const copyResponse = await fetch(newUrl, {
      method: 'PUT',
      headers: {
        ...copyHeaders,
        'Authorization': copyAuth,
      },
    });

    if (!copyResponse.ok) {
      const errorText = await copyResponse.text();
      console.error('S3 copy failed:', copyResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to copy file in S3', details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const deleteHeaders = {
      'host': `${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    };
    const { authorization: deleteAuth } = await getSignature('DELETE', oldKey, deleteHeaders);

    const deleteResponse = await fetch(`https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${oldKey}`, {
      method: 'DELETE',
      headers: {
        ...deleteHeaders,
        'Authorization': deleteAuth,
      },
    });

    if (!deleteResponse.ok) {
      console.error('S3 delete failed:', deleteResponse.status);
    }

    const newTags = newFilename
      .replace(/\.[^/.]+$/, "")
      .split(/[-_\s]+/)
      .filter((tag) => tag.length > 0)
      .map((tag) => tag.toLowerCase());

    const { data: updatedImage, error: updateError } = await supabase
      .from("images")
      .update({
        filename: newFilename,
        url: newUrl,
        tags: newTags,
      })
      .eq("id", imageId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update image metadata', details: updateError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Rename successful', data: updatedImage }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Rename error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});