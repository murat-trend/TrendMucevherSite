/**
 * One-off scenario log — not part of app build.
 */
import { InterpreterService } from "../lib/ai/interpreter/interpreter.service";
import { RuleEngineService } from "../lib/ai/interpreter/rule-engine.service";
import { FinalPromptBuilder } from "../lib/ai/builder/finalPrompt.builder";
import { PromptValidator } from "../lib/ai/validator/prompt.validator";

const SCENARIOS = [
  "eskitilmiş gümüş gotik yüzük",
  "medusa motifli oksitli gümüş kolye ucu",
  "elmas taşlı altın yüzük",
  "ejderha motifli oval gümüş madalyon",
  "minimal rose gold küpe",
];

const interpreter = new InterpreterService();
const ruleEngine = new RuleEngineService();
const builder = new FinalPromptBuilder();
const promptValidator = new PromptValidator();

function run() {
  SCENARIOS.forEach((text, i) => {
    const parsed = interpreter.parse(text, "tr", false);
    const normalized = ruleEngine.apply(parsed);
    const validation = promptValidator.validate(normalized);
    const built = builder.build(normalized, false);

    console.log(`\n========== Senaryo ${i + 1} ==========`);
    console.log(`input: ${JSON.stringify(text)}`);
    console.log("validation.isValid:", validation.isValid);
    console.log("validation.score:", validation.score);
    console.log("validation.warnings:", validation.warnings);
    console.log("validation.missingFields:", validation.missingFields);
    console.log("productType:", normalized.productType);
    console.log("motifs:", normalized.motifs);
    console.log("shapeHints:", normalized.shapeHints);
    console.log("gemstoneHints:", normalized.gemstoneHints);
    console.log("materialHints:", normalized.materialHints);
    console.log("lightingHints:", normalized.lightingHints);
    console.log("backgroundHints:", normalized.backgroundHints);
    console.log(
      "qualityConstraints (oxidation only):",
      parsed.qualityConstraints
    );
    console.log(
      "negativeConstraints (oxidation only):",
      parsed.negativeConstraints
    );
    console.log(
      "finalPromptEn (ilk 200 char):",
      built.finalPromptEn.slice(0, 200) +
        (built.finalPromptEn.length > 200 ? "…" : "")
    );
    console.log("imagePromptEn (tam):", built.imagePromptEn ?? "");
  });
}

run();
