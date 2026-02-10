import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calculator, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Parser } from "expr-eval";

interface FormulaBuilderProps {
  value?: string;
  onChange: (formula: string) => void;
  benefitType?: string;
}

interface FormulaElement {
  id: string;
  type: "variable" | "operator" | "constant" | "function";
  value: string;
  display: string;
}

// Available variables based on St. Kitts & Nevis Social Security
const AVAILABLE_VARIABLES = [
  { key: "AWW", name: "Average Weekly Wage", description: "Based on contribution history", sampleValue: 350 },
  { key: "AWE", name: "Average Weekly Earnings", description: "Last 13 weeks earnings", sampleValue: 375 },
  { key: "AIW", name: "Average Insurable Wage", description: "Lifetime average insurable wages", sampleValue: 320 },
  { key: "TotalContributions", name: "Total Contributions", description: "Total number of contributions paid", sampleValue: 650 },
  { key: "PaidContributions", name: "Paid Contributions", description: "Verified paid contributions", sampleValue: 645 },
  { key: "RecentContributions13", name: "Recent 13 Weeks", description: "Contributions in last 13 weeks", sampleValue: 13 },
  { key: "RecentContributions12", name: "Recent 12 Months", description: "Contributions in last 12 months", sampleValue: 52 },
  { key: "Age", name: "Age", description: "Age at claim date", sampleValue: 62 },
  { key: "MinWeeklyBenefit", name: "Min Weekly Benefit", description: "Statutory minimum", sampleValue: 36 },
  { key: "MaxWeeklyBenefit", name: "Max Weekly Benefit", description: "Statutory maximum", sampleValue: 300 },
  { key: "MinMonthlyBenefit", name: "Min Monthly Benefit", description: "Statutory minimum pension", sampleValue: 260 },
  { key: "MaxMonthlyBenefit", name: "Max Monthly Benefit", description: "Statutory maximum pension", sampleValue: 1500 },
];

const OPERATORS = [
  { value: "+", display: "+", description: "Add" },
  { value: "-", display: "−", description: "Subtract" },
  { value: "*", display: "×", description: "Multiply" },
  { value: "/", display: "÷", description: "Divide" },
  { value: "%", display: "%", description: "Percentage" },
  { value: "(", display: "(", description: "Open parenthesis" },
  { value: ")", display: ")", description: "Close parenthesis" },
];

const FUNCTIONS = [
  { value: "MIN", display: "MIN()", description: "Minimum value" },
  { value: "MAX", display: "MAX()", description: "Maximum value" },
  { value: "ROUND", display: "ROUND()", description: "Round to nearest" },
  { value: "IF", display: "IF()", description: "Conditional logic" },
];

export function FormulaBuilder({ value, onChange, benefitType }: FormulaBuilderProps) {
  const [formulaElements, setFormulaElements] = useState<FormulaElement[]>([]);
  const [calculatedResult, setCalculatedResult] = useState<number | null>(null);
  const [formulaText, setFormulaText] = useState(value || "");

  useEffect(() => {
    if (value) {
      setFormulaText(value);
    }
  }, [value]);

  useEffect(() => {
    onChange(formulaText);
    calculatePreview();
  }, [formulaText]);

  const addVariable = (variable: typeof AVAILABLE_VARIABLES[0]) => {
    const newElement: FormulaElement = {
      id: `var-${Date.now()}`,
      type: "variable",
      value: `{${variable.key}}`,
      display: variable.key,
    };
    setFormulaElements([...formulaElements, newElement]);
    setFormulaText(formulaText + ` {${variable.key}}`);
  };

  const addOperator = (operator: string) => {
    setFormulaText(formulaText + ` ${operator}`);
  };

  const addConstant = (constant: string) => {
    setFormulaText(formulaText + ` ${constant}`);
  };

  const addFunction = (func: string) => {
    setFormulaText(formulaText + ` ${func}`);
  };

  const clearFormula = () => {
    setFormulaElements([]);
    setFormulaText("");
    setCalculatedResult(null);
  };

  const calculatePreview = () => {
    try {
      let evalFormula = formulaText;
      
      // Replace variables with sample values
      AVAILABLE_VARIABLES.forEach(variable => {
        evalFormula = evalFormula.replace(new RegExp(`\\{${variable.key}\\}`, 'g'), variable.sampleValue.toString());
      });

      // Handle percentage operations (e.g., 60% becomes 0.60)
      evalFormula = evalFormula.replace(/(\d+\.?\d*)%/g, (match, num) => `(${num}/100)`);

      // Clean up for safe evaluation
      evalFormula = evalFormula.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      
      // Use safe math expression parser (no code injection risk)
      const parser = new Parser();
      const result = parser.evaluate(evalFormula);
      setCalculatedResult(typeof result === 'number' ? Math.round(result * 100) / 100 : null);
    } catch (e) {
      setCalculatedResult(null);
    }
  };

  const insertAtCursor = (text: string) => {
    const textarea = document.getElementById('formula-input') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = formulaText;
      const newText = currentText.substring(0, start) + text + currentText.substring(end);
      setFormulaText(newText);
      
      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      }, 0);
    } else {
      setFormulaText(formulaText + text);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Variables Panel */}
        <Card className="p-4 border-2">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">Available Variables</h4>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {AVAILABLE_VARIABLES.map((variable) => (
              <div
                key={variable.key}
                className="p-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-primary/30"
                onClick={() => insertAtCursor(`{${variable.key}}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm font-semibold text-primary">{variable.key}</div>
                    <div className="text-xs text-muted-foreground">{variable.name}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {variable.sampleValue}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{variable.description}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Operators & Functions Panel */}
        <Card className="p-4 border-2">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-3">Operators</h4>
              <div className="grid grid-cols-4 gap-2">
                {OPERATORS.map((op) => (
                  <Button
                    key={op.value}
                    variant="outline"
                    size="sm"
                    className="font-mono text-lg"
                    onClick={() => insertAtCursor(` ${op.value} `)}
                    title={op.description}
                  >
                    {op.display}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">Functions</h4>
              <div className="grid grid-cols-2 gap-2">
                {FUNCTIONS.map((func) => (
                  <Button
                    key={func.value}
                    variant="outline"
                    size="sm"
                    className="font-mono"
                    onClick={() => insertAtCursor(`${func.value}()`)}
                    title={func.description}
                  >
                    {func.display}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">Constants</h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter number"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      insertAtCursor(input.value);
                      input.value = '';
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                    if (input?.value) {
                      insertAtCursor(input.value);
                      input.value = '';
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {calculatedResult !== null && (
              <Alert className="bg-primary/5 border-primary/30">
                <Calculator className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <div className="text-sm font-semibold">Preview Result (with sample data):</div>
                  <div className="text-2xl font-bold text-primary mt-1">
                    XCD {calculatedResult.toFixed(2)}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      </div>

      {/* Formula Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="formula-input">Formula</Label>
          <Button variant="ghost" size="sm" onClick={clearFormula}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
        <textarea
          id="formula-input"
          className="w-full min-h-[100px] p-3 bg-muted border-2 border-border rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={formulaText}
          onChange={(e) => setFormulaText(e.target.value)}
          placeholder="Click variables and operators above to build your formula, or type directly..."
        />
      </div>

      {/* Common Formula Templates */}
      <Card className="p-4 border-2">
        <h4 className="font-semibold text-sm mb-3">Common Formula Templates</h4>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => setFormulaText("0.60 * {AWE}")}
          >
            60% of Average Weekly Earnings
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => setFormulaText("0.65 * {AWW}")}
          >
            65% of Average Weekly Wage
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => setFormulaText("0.30 * {AWW} + 0.01 * ({TotalContributions} - 500)")}
          >
            30% of AWW + 1% per contribution above 500
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start font-mono text-xs"
            onClick={() => setFormulaText("MIN(MAX({AWW} * 0.60, {MinWeeklyBenefit}), {MaxWeeklyBenefit})")}
          >
            60% of AWW with min/max limits
          </Button>
        </div>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>How to use:</strong> Click on variables from the left panel to add them to your formula. 
          Use operators and functions to build complex calculations. Sample values are shown for preview only.
          Variables are enclosed in curly braces like {"{AWW}"}.
        </AlertDescription>
      </Alert>
    </div>
  );
}
