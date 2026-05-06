const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
    <section className="w-full max-w-lg rounded-md bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <button className="btn-secondary" type="button" onClick={onClose}>Close</button>
      </div>
      {children}
    </section>
  </div>
);

export default Modal;
