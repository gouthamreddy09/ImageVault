# PhotoNest

A full-stack image upload and search application similar to Google Photos, built with React, Supabase Edge Functions, and AWS S3.

## Features

- Upload images with drag-and-drop interface
- Real-time image preview before upload
- Search images by filename or auto-generated tags
- Responsive grid layout with hover animations
- Cloud storage using AWS S3
- PostgreSQL database for metadata storage
- Modern, clean UI with Tailwind CSS

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Lucide React for icons

**Backend:**
- Supabase Edge Functions (Deno runtime)
- Supabase PostgreSQL database
- AWS S3 for image storage

## Prerequisites

Before you begin, ensure you have:

1. **AWS Account** with S3 bucket created
   - Access Key ID
   - Secret Access Key
   - S3 Bucket Name
   - AWS Region

2. **Supabase Project** (already configured in this project)

## Setup Instructions

### 1. Configure AWS Credentials

Edit the `.env` file and add your AWS credentials:

```bash
AWS_ACCESS_KEY_ID=your_actual_access_key_id
AWS_SECRET_ACCESS_KEY=your_actual_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket_name
```

**Important:** Make sure your S3 bucket has the correct CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### 2. Configure S3 Bucket Policy

Your S3 bucket should allow public read access for uploaded images. Add this bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your_bucket_name/*"
    }
  ]
}
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

The development server is automatically started for you in this environment.

## Project Structure

```
/
├── src/
│   ├── components/
│   │   ├── UploadForm.tsx      # Image upload with preview
│   │   ├── SearchBar.tsx       # Search functionality
│   │   └── ImageGrid.tsx       # Responsive image grid
│   ├── App.tsx                 # Main application component
│   └── main.tsx                # Application entry point
├── supabase/
│   └── functions/
│       ├── upload-image/       # Handles S3 upload and DB insert
│       ├── search-images/      # Search images by keyword
│       └── get-images/         # Fetch all images
└── .env                        # Environment variables
```

## API Endpoints

### 1. Upload Image
- **Endpoint:** `POST /functions/v1/upload-image`
- **Body:** FormData with 'image' file
- **Description:** Uploads image to S3 and stores metadata in database
- **Auto-generates tags** from filename

### 2. Get All Images
- **Endpoint:** `GET /functions/v1/get-images`
- **Description:** Retrieves all uploaded images from database

### 3. Search Images
- **Endpoint:** `GET /functions/v1/search-images?query=keyword`
- **Description:** Searches images by filename or tags (case-insensitive)

## Database Schema

### Images Table
```sql
CREATE TABLE images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  url text NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);
```

## How It Works

1. **Upload Process:**
   - User selects an image file
   - Preview is shown before upload
   - File is sent to `upload-image` Edge Function
   - Edge Function uploads to S3 using AWS SDK
   - Metadata (filename, URL, tags) is stored in PostgreSQL
   - Tags are auto-generated from filename

2. **Search Process:**
   - User enters search keyword
   - Frontend calls `search-images` with query parameter
   - Backend filters images by matching filename or tags
   - Results are displayed in responsive grid

3. **Display:**
   - Images load in responsive grid (2-5 columns)
   - Hover animations show filename and tags
   - Lazy loading for performance

## Deployment

### Frontend (Netlify)

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Backend (Supabase Edge Functions)

The Edge Functions are already deployed in your Supabase project. To update them:

1. Make changes to function files in `supabase/functions/`
2. Functions are automatically deployed through the Supabase dashboard

### Environment Variables for Production

Add these to your Netlify deployment:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Add these to your Supabase Edge Functions:
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_bucket_name
```

## Features Demo

- **Clean UI:** Minimalist white design with blue accents
- **Responsive:** Works on mobile, tablet, and desktop
- **Fast Upload:** Direct S3 upload with progress feedback
- **Smart Search:** Keyword matching across filenames and tags
- **Auto-tagging:** Extracts tags from filename automatically
- **Grid Layout:** Beautiful responsive grid with hover effects

## Security

- Row Level Security (RLS) enabled on database
- Public access policies for demo purposes
- CORS configured for cross-origin requests
- Environment variables for sensitive credentials

## Future Enhancements

- User authentication and private galleries
- AWS Rekognition for AI-generated tags
- Image compression before upload
- Bulk upload support
- Delete functionality
- Advanced filtering and sorting
- Share links for images

## Troubleshooting

**Images not uploading:**
- Check AWS credentials in `.env`
- Verify S3 bucket CORS configuration
- Check S3 bucket policy allows PUT operations

**Images not displaying:**
- Verify S3 bucket policy allows public read access
- Check that uploaded images are publicly accessible

**Search not working:**
- Ensure database has image records
- Check that tags are being generated correctly

## License

MIT

## Support

For issues and questions, please check the console logs for detailed error messages.
