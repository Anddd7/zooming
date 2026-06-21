export interface ProjectBudget {
  amount: number;
  currency: string;
}

export interface ProjectAggregate {
  id: string;
  name: string;
  budget: ProjectBudget;
}
