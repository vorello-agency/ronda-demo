"use client";

import { useState } from "react";

type TrainingProgram = {
  id: string;
  title: string;
  format: string;
  description: string;
  focus: string;
};

export function TrainingAccordion({ programs }: { programs: readonly TrainingProgram[] }) {
  const [openId, setOpenId] = useState<string | null>(programs[0]?.id ?? null);

  return programs.map((program, index) => {
    const isOpen = openId === program.id;
    const triggerId = `training-${program.id}-trigger`;
    const panelId = `training-${program.id}-panel`;

    return <div className="training-program" data-open={isOpen} key={program.id}>
      <h3 className="training-program-heading">
        <button
          className="training-program-trigger"
          type="button"
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setOpenId(current => current === program.id ? null : program.id)}
        >
          <span className="training-program-number" aria-hidden="true">0{index + 1}</span>
          <span className="training-program-title"><span className="training-program-format">{program.format}</span>{program.title}</span>
          <span className="training-program-toggle" aria-hidden="true" />
        </button>
      </h3>
      <div className="training-program-panel" id={panelId} role="region" aria-labelledby={triggerId} aria-hidden={!isOpen} inert={!isOpen}>
        <div className="training-program-panel-inner">
          <div className="training-program-body">
            <p>{program.description}</p>
            <p className="training-program-focus">{program.focus}</p>
          </div>
        </div>
      </div>
    </div>;
  });
}
