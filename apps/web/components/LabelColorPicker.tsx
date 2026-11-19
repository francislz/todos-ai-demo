'use client';

import { LABEL_COLORS, type LabelColor } from '@todos/core/client';

interface LabelColorPickerProps {
  /** Radio group name, unique per picker on the page. */
  name: string;
  value: LabelColor;
  onChange: (color: LabelColor) => void;
  disabled?: boolean;
}

/** Eight round swatches as native radios; the selected one has a ring and a check mark. */
export function LabelColorPicker({ name, value, onChange, disabled }: LabelColorPickerProps) {
  return (
    <span className="swatches" role="radiogroup" aria-label="Color">
      {LABEL_COLORS.map((color) => {
        const checked = color === value;
        return (
          <label key={color} className={`swatch c-${color}${checked ? ' is-on' : ''}`}>
            <input
              type="radio"
              className="swatch__input"
              name={name}
              value={color}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(color)}
              data-testid="label-color-option"
              data-color={color}
            />
            <span className="visually-hidden">{color}</span>
            {checked && (
              <span className="swatch__check" aria-hidden="true">
                ✓
              </span>
            )}
          </label>
        );
      })}
    </span>
  );
}
