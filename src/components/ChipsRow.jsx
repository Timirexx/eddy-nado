export default function ChipsRow({ chips, onPick, disabled }) {
  return (
    <div className="chips-row">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          className="chip"
          disabled={disabled}
          onClick={() => onPick(chip.prompt)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
