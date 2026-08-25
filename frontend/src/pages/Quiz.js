import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, CheckCircle2, XCircle, ChevronRight, RotateCcw, Download, Award, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";

function drawCertificate(canvas, name, score, total, issuedAt) {
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
  // Use the stored issue date so re-downloading an old certificate doesn't
  // restamp it with today's date.
  const date = new Date(issuedAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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

// Draws the earned certificate and offers it as a PNG download.
function CertificatePanel({ certificate }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && certificate) {
      drawCertificate(canvasRef.current, certificate.name || "SafeNet Learner", certificate.score, certificate.total, certificate.issued_at);
    }
  }, [certificate]);

  const download = () => {
    const link = document.createElement("a");
    link.download = `SafeNet-Certificate-${(certificate.name || "learner").replace(/\s+/g, "-")}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const issued = certificate.issued_at
    ? new Date(certificate.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="mt-8" data-testid="certificate-panel">
      <canvas ref={canvasRef} className="w-full max-w-xl mx-auto rounded-lg border" data-testid="certificate-canvas" />
      {issued && (
        <p className="text-xs text-muted-foreground mt-3">
          Issued on {issued} · {certificate.score}/{certificate.total}
        </p>
      )}
      <Button onClick={download} className="mt-5 rounded-full bg-sky-500 hover:bg-sky-600 text-white" data-testid="download-certificate-button">
        <Download className="w-4 h-4 mr-2" /> Download Certificate
      </Button>
    </div>
  );
}

export default function Quiz() {
  const [questions, setQuestions] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null); // server verdict for the current question
  const [checking, setChecking] = useState(false);
  const [score, setScore] = useState(0);          // authoritative running score from the server
  const [result, setResult] = useState(null);     // final payload from /quiz/finish
  const [certificate, setCertificate] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Fetched separately so a returning user sees their certificate before
  // starting another attempt.
  useEffect(() => {
    api.get("/quiz/certificate")
      .then((r) => setCertificate(r.data.certificate))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoadError(false);
    setQuestions(null);
    setIdx(0); setSelected(null); setFeedback(null); setScore(0); setResult(null);
    api.get("/quiz/questions")
      .then((r) => { setQuestions(r.data.questions); setAttemptId(r.data.attempt_id); })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loadError)
    return <ErrorState className="py-32" message="We couldn't load the quiz. Check your connection and try again." onRetry={load} testId="quiz-error" />;
  if (!questions)
    return <LoadingState className="py-32" label="Loading quiz" />;
  if (questions.length === 0)
    return <EmptyState className="py-32" icon={GraduationCap} title="No quiz questions yet" message="The quiz is being prepared — check back soon." testId="quiz-empty" />;

  const q = questions[idx];
  const answered = feedback !== null;
  const pct = Math.round(((answered ? idx + 1 : idx) / questions.length) * 100);

  // The browser no longer knows the answers — the server grades each one.
  const choose = async (i) => {
    if (answered || checking) return;
    setSelected(i);
    setChecking(true);
    try {
      const { data } = await api.post("/quiz/answer", { attempt_id: attemptId, question_id: q.id, answer_index: i });
      setFeedback(data);
      setScore(data.score);
    } catch (e) {
      setSelected(null);
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setChecking(false);
    }
  };

  const next = async () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1); setSelected(null); setFeedback(null);
      return;
    }
    setFinishing(true);
    try {
      const { data } = await api.post("/quiz/finish", { attempt_id: attemptId });
      setResult(data);
      if (data.certificate) setCertificate(data.certificate);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setFinishing(false);
    }
  };

  if (result) {
    const { passed, newly_issued: newlyIssued } = result;
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20" data-testid="quiz-result-page">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border bg-card p-10 text-center">
          <Award className={`w-16 h-16 mx-auto ${passed ? "text-amber-500" : "text-muted-foreground"}`} strokeWidth={1.3} />
          <h1 className="font-heading text-3xl font-bold tracking-tighter mt-5">
            {passed ? "Well done, cyber defender!" : "Keep training!"}
          </h1>
          <p className="font-heading text-5xl font-bold text-sky-500 mt-6" data-testid="quiz-final-score">
            {result.score}<span className="text-2xl text-muted-foreground">/{result.total}</span>
          </p>

          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
            {!passed
              ? "Score 60% or higher to earn your certificate. Review the safety tips and try again!"
              : newlyIssued
                ? "You have a sharp eye for scams. Your certificate is ready below."
                : "Nice work again! Your certificate is issued once and keeps its original result."}
          </p>

          {passed && certificate && <CertificatePanel certificate={certificate} />}

          <Button variant="outline" onClick={load} className="mt-8 rounded-full" data-testid="quiz-restart-button">
            <RotateCcw className="w-4 h-4 mr-2" /> {passed ? "Practice again" : "Retake Quiz"}
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

      {certificate && (
        <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex items-start gap-3" data-testid="already-certified-banner">
          <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed">
            You already earned your certificate ({certificate.score}/{certificate.total}). This run is practice — your
            certificate is issued once and keeps its original result.
          </p>
        </div>
      )}

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
              if (i === feedback.correct_index) style = "border-emerald-500 bg-emerald-500/10";
              else if (i === selected) style = "border-red-500 bg-red-500/10";
              else style = "border opacity-60";
            } else if (checking && i === selected) {
              style = "border-sky-500/60";
            }
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered || checking}
                data-testid={`quiz-option-${i}`}
                className={`w-full text-left rounded-xl p-4 text-sm md:text-base flex items-center gap-3 transition-colors duration-200 ${style}`}
              >
                <span className="w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {checking && i === selected && <Loader2 className="w-4 h-4 animate-spin text-sky-500 shrink-0" />}
                {answered && i === feedback.correct_index && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                {answered && i === selected && i !== feedback.correct_index && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-sky-500/30 bg-sky-500/5 p-5" data-testid="quiz-explanation" role="status">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-500 mb-2">
              {feedback.correct ? "Correct!" : "Not quite"}
            </p>
            <p className="text-sm leading-relaxed">{feedback.explanation}</p>
            <Button onClick={next} disabled={finishing} className="mt-4 rounded-full bg-sky-500 hover:bg-sky-600 text-white" data-testid="quiz-next-button">
              {finishing
                ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finishing...</>)
                : (<>{idx + 1 >= questions.length ? "See Results" : "Next Question"} <ChevronRight className="w-4 h-4 ml-1" /></>)}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
