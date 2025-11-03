import { NextRequest } from "next/server";
import { getArticles, getArticleById, updateArticle, createArticle, deleteArticle, incrementArticleViews } from "@/lib/dbClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const incrementViews = searchParams.get("incrementViews");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // If id is provided, return single article
    if (id) {
      const article = await getArticleById(id);
      if (!article) return Response.json({ error: "Article not found" }, { status: 404 });
      
      // Increment views if requested
      if (incrementViews === "true") {
        await incrementArticleViews(id);
        article.views = (article.views || 0) + 1;
      }
      
      return Response.json(article);
    }

    const filters: any = {};
    if (category) filters.category = category;
    if (search) filters.search = search;
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const result = await getArticles(filters);
    return Response.json(result);
  } catch (error) {
    console.error("Articles GET error:", error);
    return Response.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.title || !data.description || !data.category) {
      return Response.json({ error: "Title, description, and category are required" }, { status: 400 });
    }
    
    const result = await createArticle({
      ...data,
      status: data.status || 'published',
      publishedDate: new Date().toISOString()
    });
    
    return Response.json(result, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("Articles POST error:", error);
    return Response.json({ error: "Failed to create article" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const data = await request.json();
    
    // Use id from query params or body
    const articleId = id || data.id;
    
    if (!articleId) {
      return Response.json({ error: "Article ID is required" }, { status: 400 });
    }
    
    const result = await updateArticle(articleId, data);
    return Response.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("Articles PATCH error:", error);
    return Response.json({ error: "Failed to update article" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return Response.json({ error: "Article ID is required" }, { status: 400 });
    }
    
    await deleteArticle(id);
    return Response.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error("Articles DELETE error:", error);
    return Response.json({ error: "Failed to delete article" }, { status: 500 });
  }
}