export interface HealthCheckItem {
  name: string;
  category: "community" | "documentation" | "security" | "maintenance" | "ci";
  status: "pass" | "warn" | "fail";
  score: number; // 0 to 100
  details: string;
  recommendation?: string;
}

export interface RepoHealthResult {
  repository: string;
  overallScore: number; // 0 to 100
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  checks: HealthCheckItem[];
  recommendations: string[];
}
