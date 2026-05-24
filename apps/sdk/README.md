# ContentFlow NodeJS SDK

This is the NodeJS SDK for [ContentFlow](https://contentflow.com).

You can start by installing the package:

```bash
npm install @contentflow/node
```

## Usage
```typescript
import ContentFlow from '@contentflow/node';
const contentflow = new ContentFlow('your api key', 'your self-hosted instance (optional)');
```

The available methods are:
- `post(posts: CreatePostDto)` - Schedule a post to ContentFlow
- `postList(filters: GetPostsDto)` - Get a list of posts
- `upload(file: Buffer, extension: string)` - Upload a file to ContentFlow
- `integrations()` - Get a list of connected channels
- `deletePost(id: string)` - Delete a post by ID

Alternatively you can use the SDK with curl, check the [ContentFlow API documentation](https://docs.contentflow.com/public-api) for more information.