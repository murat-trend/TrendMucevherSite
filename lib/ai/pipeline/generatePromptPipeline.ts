import type {
  BuiltPrompt,
  JewelryIntent,
  SupportedLanguage,
  ValidationResult,
} from "../types/prompt.types";
import { InterpreterService } from "../interpreter/interpreter.service";
import { RuleEngineService } from "../interpreter/rule-engine.service";
import { FinalPromptBuilder } from "../builder/finalPrompt.builder";
import { PromptValidator } from "../validator/prompt.validator";

export type PromptPipelineResult = {
  intent: JewelryIntent;
  validation: ValidationResult;
  output: BuiltPrompt;
};

const interpreterService = new InterpreterService();
const ruleEngineService = new RuleEngineService();
const finalPromptBuilder = new FinalPromptBuilder();
const promptValidator = new PromptValidator();

export function generatePromptPipeline(
  rawPrompt: string,
  language: SupportedLanguage = "tr",
  mode3DExport: boolean = false
): PromptPipelineResult {
  const parsedIntent = interpreterService.parse(rawPrompt, language);
  const normalizedIntent = ruleEngineService.apply(parsedIntent);
  const validation = promptValidator.validate(normalizedIntent);
  const output = finalPromptBuilder.build(normalizedIntent, mode3DExport);

  return {
    intent: normalizedIntent,
    validation,
    output,
  };
}
