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
3. Add the following environment variables to your backend `.env` file:

```
GCS_BUCKET_NAME=your-bucket-name
GCS_IMAGE_FOLDER=community-images        # optional, defaults to community-images
GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/your-bucket-name   # optional override
COMMUNITY_IMAGES_MAX=4                   # optional override for max images/post
COMMUNITY_IMAGE_MAX_MB=5                 # optional override for max size in MB
```

### 2. Database table

Create the `CommunityPostImages` table (MySQL syntax shown):

```sql
CREATE TABLE IF NOT EXISTS CommunityPostImages (
	image_id INT AUTO_INCREMENT PRIMARY KEY,
	post_id INT NOT NULL,
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
- Deleting a post removes both the database rows and the backing objects in Cloud Storage.
