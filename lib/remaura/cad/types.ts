export type CadCoachFocusKey = "ringRail" | "headCurves" | "prongLayout" | "shankBlend";

export type CadCoachStep = {
  id: string;
  title: string;
  objective: string;
  commandCandidates: string[];
  instruction: string;
  validationChecks: string[];
  focus: CadCoachFocusKey;
};

export type CadCoachWorkflow = {
  id: string;
  title: string;
  source: string;
  steps: CadCoachStep[];
};
