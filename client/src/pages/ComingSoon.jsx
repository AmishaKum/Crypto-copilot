export default function ComingSoon({ title }) {
  return (
    <div className="card mx-auto max-w-lg text-center">
      <p className="label">In progress</p>
      <h1 className="mt-2 font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-500">This module is on the build plan and lands in an upcoming step.</p>
    </div>
  );
}
