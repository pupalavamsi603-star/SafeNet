import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, CheckCircle2, XCircle, ChevronRight, RotateCcw, Download, Award, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";

function drawCertificate(canvas, name, score, total) {
  const ctx = canvas.getContext("2d");
  const W = 1200, H = 850;
  canvas.width = W; canvas.height = H;
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#3B82F6";
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = "rgba(59,130,246,0.35)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(58, 58, W - 116, H - 116);

  ctx.fillStyle = "#3B82F6";
  ctx.font = "bold 30px 'Unbounded', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SafeNet", W / 2, 140);
  ctx.fillStyle = "#94A3B8";
  ctx.font = "16px 'IBM Plex Sans', sans-serif";
  ctx.fillText("CYBER SAFETY AWARENESS PROGRAM", W / 2, 175);

  ctx.fillStyle = "#F8FAFC";
  ctx.font = "bold 52px 'Unbounded', sans-serif";
  ctx.fillText("Certificate of Completion", W / 2, 280);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "20px 'IBM Plex Sans', sans-serif";
  ctx.fillText("This certifies that", W / 2, 360);

  ctx.fillStyle = "#3B82F6";
  ctx.font = "bold 46px 'Unbounded', sans-serif";
  ctx.fillText(name, W / 2, 430);

  ctx.strokeStyle = "rgba(59,130,246,0.5)";
  ctx.beginPath();
  ctx.moveTo(W / 2 - 260, 455);
  ctx.lineTo(W / 2 + 260, 455);
  ctx.stroke();

  ctx.fillStyle = "#CBD5E1";
  ctx.font = "20px 'IBM Plex Sans', sans-serif";
  ctx.fillText("has successfully completed the SafeNet Cyber Safety Quiz", W / 2, 510);
  ctx.fillText(`with a score of ${score} out of ${total} (${Math.round((score / total) * 100)}%)`, W / 2, 545);

  ctx.fillStyle = "#64748B";
  ctx.font = "16px 'IBM Plex Sans', sans-serif";
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  ctx.fillText(`Issued on ${date}`, W / 2, 640);

  ctx.strokeStyle = "#3B82F6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, 730, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#3B82F6";
  ctx.font = "bold 30px 'IBM Plex Sans', sans-serif";
  ctx.fillText("✓", W / 2, 742);
}

export default function Quiz() {
  const [questions, setQuestions] = useState(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [name, setName] = useState("");
  const [certReady, setCertReady] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    api.get("/quiz/questions").then((r) => setQuestions(r.data)).catch(() => setQuestions([]));
  }, []);

  if (!questions)
    return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>;
  if (questions.length === 0)
    return <div className="text-center py-32 text-muted-foreground">No quiz questions available yet.</div>;

  const q = questions[idx];
  const pct = Math.round((idx / questions.length) * 100);

  const choose = (i) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (i === q.correct_index) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      setFinished(true);
      api.post("/quiz/submit", { name: name || "Anonymous", score, total: questions.length }).catch(() => {});
    } else {
      setIdx(idx + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const restart = () => {
    setIdx(0); setSelected(null); setAnswered(false); setScore(0); setFinished(false); setCertReady(false);
  };

  const generateCert = () => {
    if (!name.trim()) return;
    setCertReady(true);
    setTimeout(() => drawCertificate(canvasRef.current, name.trim(), score, questions.length), 50);
  };

  const downloadCert = () => {
    const link = document.createElement("a");
    link.download = `SafeNet-Certificate-${name.trim().replace(/\s+/g, "-")}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  if (finished) {
    const passed = score / questions.length >= 0.6;
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20" data-testid="quiz-result-page">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border bg-card p-10 text-center">
          <Award className={`w-16 h-16 mx-auto ${passed ? "text-amber-500" : "text-muted-foreground"}`} strokeWidth={1.3} />
          <h1 className="font-heading text-3xl font-bold tracking-tighter mt-5">
            {passed ? "Well done, cyber defender!" : "Keep training!"}
          </h1>
          <p className="font-heading text-5xl font-bold text-sky-500 mt-6" data-testid="quiz-final-score">
            {score}<span className="text-2xl text-muted-foreground">/{questions.length}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            {passed
              ? "You have a sharp eye for scams. Claim your certificate below."
              : "Score 60% or higher to earn your certificate. Review the safety tips and try again!"}
          </p>

          {passed && !certReady && (
            <div className="mt-8 max-w-sm mx-auto space-y-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name for the certificate" data-testid="certificate-name-input" />
              <Button onClick={generateCert} disabled={!name.trim()} className="w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white" data-testid="generate-certificate-button">
                <Award className="w-4 h-4 mr-2" /> Generate Certificate
              </Button>
            </div>
          )}

          {certReady && (
            <div className="mt-8">
              <canvas ref={canvasRef} className="w-full max-w-xl mx-auto rounded-lg border" data-testid="certificate-canvas" />
              <Button onClick={downloadCert} className="mt-5 rounded-full bg-sky-500 hover:bg-sky-600 text-white" data-testid="download-certificate-button">
                <Download className="w-4 h-4 mr-2" /> Download Certificate
              </Button>
            </div>
          )}

          <Button variant="outline" onClick={restart} className="mt-8 rounded-full" data-testid="quiz-restart-button">
            <RotateCcw className="w-4 h-4 mr-2" /> Retake Quiz
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16" data-testid="quiz-page">
      <p className="text-xs uppercase tracking-[0.25em] text-amber-500 mb-4 flex items-center gap-2">
        <GraduationCap className="w-4 h-4" /> Cyber Safety Quiz
      </p>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">Question {idx + 1} of {questions.length}</p>
        <p className="text-sm font-medium text-sky-500" data-testid="quiz-running-score">Score: {score}</p>
      </div>
      <Progress value={pct} className="h-1.5 mb-8" />

      <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <h2 className="font-heading text-lg md:text-xl font-semibold tracking-tight leading-snug" data-testid="quiz-question-text">{q.question}</h2>
        <div className="mt-7 space-y-3">
          {q.options.map((opt, i) => {
            let style = "border hover:border-sky-500/60";
            if (answered) {
              if (i === q.correct_index) style = "border-emerald-500 bg-emerald-500/10";
              else if (i === selected) style = "border-red-500 bg-red-500/10";
              else style = "border opacity-60";
            }
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered}
                data-testid={`quiz-option-${i}`}
                className={`w-full text-left rounded-xl p-4.5 p-4 text-sm md:text-base flex items-center gap-3 transition-colors duration-200 ${style}`}
              >
                <span className="w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {answered && i === q.correct_index && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                {answered && i === selected && i !== q.correct_index && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-sky-500/30 bg-sky-500/5 p-5" data-testid="quiz-explanation">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-500 mb-2">
              {selected === q.correct_index ? "Correct!" : "Not quite"}
            </p>
            <p className="text-sm leading-relaxed">{q.explanation}</p>
            <Button onClick={next} className="mt-4 rounded-full bg-sky-500 hover:bg-sky-600 text-white" data-testid="quiz-next-button">
              {idx + 1 >= questions.length ? "See Results" : "Next Question"} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
