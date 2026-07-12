import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, UserRound, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { Badge } from "../components/ui/badge";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get(`/blog/${slug}`).then((r) => setPost(r.data)).catch(() => setError(true));
    window.scrollTo(0, 0);
  }, [slug]);

  if (error)
    return <div className="text-center py-32 text-muted-foreground" data-testid="blog-not-found">Article not found. <Link to="/blog" className="text-sky-500">Back to blog</Link></div>;
  if (!post)
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16" data-testid="blog-post-page">
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-sky-500 transition-colors duration-200" data-testid="back-to-blog-link">
        <ArrowLeft className="w-4 h-4" /> All articles
      </Link>

      <div className="mt-8 flex items-center gap-3 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-sky-500 border-sky-500/30">{post.category}</Badge>
        <span className="flex items-center gap-1"><UserRound className="w-3 h-3" /> {post.author}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.read_time}</span>
      </div>

      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tighter mt-5 leading-[1.15]">{post.title}</h1>
      <p className="mt-5 text-base text-muted-foreground leading-relaxed">{post.excerpt}</p>

      <img src={post.image} alt={post.title} className="mt-9 rounded-xl border w-full h-64 sm:h-80 object-cover" />

      <div className="mt-10 space-y-5">
        {post.content.split("\n\n").map((para, i) => (
          <p key={i} className="text-sm md:text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">{para}</p>
        ))}
      </div>
    </article>
  );
}
