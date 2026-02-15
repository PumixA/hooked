Feature: Project step-by-step flow
  In order to follow complex patterns
  As a crafter
  I want to split a project into steps with row targets and per-step instruction memos

  Scenario: Default project has no steps
    Given a project exists
    And the project has no steps configured
    When I open project detail
    Then I do not see any step card under the counter

  Scenario: Define steps in project settings
    Given a project exists
    When I open project settings
    And I add a step "Côtes" with target rows 20 and memo "Augmentation tous les 4 rangs"
    And I save settings
    Then the project has steps configured
    And I see the step card under the counter

  Scenario: Auto advance to next step when reaching target rows
    Given a project has steps:
      | title   | target_rows | current_rows |
      | Côtes   | 20          | 0            |
      | Corps   | 40          | 0            |
    And I am on project detail
    When I increment rows until step "Côtes" reaches 20
    Then the active step becomes "Corps"
