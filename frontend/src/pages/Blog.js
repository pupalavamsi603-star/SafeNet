import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Loader2, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { Badge } from "../components/ui/badge";

export default function Blog() {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    api.get("/blog").then((r) => setPosts(r.data)).catch(() => setPosts([]));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20" data-testid="blog-page">
      <p className="text-xs uppercase tracking-[0.25em] text-sky-500 mb-4">Latest cyber news & guides</p>
      <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tighter">SafeNet Blog</h1>
      <p className="mt-5 text-base text-muted-foreground max-w-2xl leading-relaxed">
        Deep dives into new scam trends, practical security guides, and news you can actually use.
      </p>

      {!posts ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
      ) : (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {posts.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            >
              <Link to={`/blog/${p.slug}`} data-testid={`blog-card-${p.slug}`} className="group block h-full rounded-xl border bg-card overflow-hidden hover:border-sky-500/50 transition-colors duration-300">
                <div className="h-44 overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-sky-500 border-sky-500/30">{p.category}</Badge>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.read_time}</span>
                  </div>
                  <h3 className="font-heading text-base font-semibold tracking-tight mt-3.5 leading-snug">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed line-clamp-3">{p.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-sky-500 mt-4 group-hover:gap-2.5 transition-[gap] duration-300">
                    Read article <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
