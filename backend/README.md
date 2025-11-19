FastAPI backend for Wahoowell

Quick start

1. Create and activate a virtual environment (Windows PowerShell):

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run the app:

```powershell
uvicorn backend.app.main:app --reload --port 8000
```

3. Health check: `GET http://localhost:8000/api/health/ping`

Next steps

- Add a database (SQLAlchemy / Tortoise / or ORM of choice)
- Add authentication (JWT / OAuth)
- Add more routers and tests

## Community post images

The community feed now supports attaching photos that are stored in Google Cloud Storage (GCS).

### 1. Configure GCS credentials

1. Create (or reuse) a GCS bucket and make the `community-images/` folder publicly readable (either bucket-level IAM or signed URLs).
2. Download a service-account key with write access to the bucket and set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the JSON file path.
3. Provide the following environment variables (via your shell, deployment service, or a local `.env` file if you prefer during development):

```
GCS_BUCKET_NAME=your-bucket-name
GCS_IMAGE_FOLDER=community-images        # optional, defaults to community-images
GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/your-bucket-name   # optional override
GCS_AUTO_MAKE_PUBLIC=true                # optional, automatically call blob.make_public()
GCS_SIGNED_URL_MODE=auto                 # auto | always | never (auto falls back if ACLs fail)
GCS_SIGNED_URL_TTL=86400                 # lifetime in seconds for signed URLs (default 24h)
COMMUNITY_IMAGES_MAX=4                   # optional override for max images/post
COMMUNITY_IMAGE_MAX_MB=5                 # optional override for max size in MB
```

### 2. Database table

Create the `CommunityPostImages` table (MySQL syntax shown):

```sql
CREATE TABLE IF NOT EXISTS CommunityPostImages (
	image_id INT AUTO_INCREMENT PRIMARY KEY,
	post_id BIGINT NOT NULL,
	file_name VARCHAR(255) NOT NULL,
	storage_path VARCHAR(512) NOT NULL,
	public_url TEXT NOT NULL,
	content_type VARCHAR(64),
	size_bytes INT,
	width SMALLINT,
	height SMALLINT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_post_image FOREIGN KEY (post_id)
		REFERENCES CommunityPosts(post_id) ON DELETE CASCADE
);
```

Images are written to `gs://<bucket>/<GCS_IMAGE_FOLDER>/posts/YYYY/MM/<uuid>.ext` with immutable cache headers.

### 3. Usage notes

- The `/api/community/posts` endpoint now expects `multipart/form-data` with `user_id`, `content`, `visibility`, and optional `images` fields.
- Each image is validated for type (PNG/JPG/WEBP/AVIF/GIF) and file size (default 5 MB limit).
- Uploaded objects must be readable from the URLs you return to clients. Either allow public access to `GCS_PUBLIC_BASE_URL` or keep `GCS_AUTO_MAKE_PUBLIC=true` so the service marks each blob as world-readable automatically.
- Deleting a post removes both the database rows and the backing objects in Cloud Storage.

#### Buckets with Public Access Prevention

If your bucket enforces Uniform Bucket-Level Access or Public Access Prevention, set `GCS_AUTO_MAKE_PUBLIC=false` and either rely on the default `GCS_SIGNED_URL_MODE=auto` (which detects ACL failures) or explicitly set `GCS_SIGNED_URL_MODE=always`. The backend now generates fresh V4 signed URLs whenever posts are loaded, so users can still view images without granting world-readable ACLs. Adjust `GCS_SIGNED_URL_TTL` if you need longer-lived links.
