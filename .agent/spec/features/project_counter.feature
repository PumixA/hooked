Feature: project row counter controls
  In order to fix mistakes while tracking progress
  As a crafter
  I want to be able to reset the counter to zero from the counter screen

  Scenario: Reset counter to zero when no steps are configured
    Given a project exists
    And the project has no steps configured
    And the project counter is greater than 0
    When I tap the reset button
    Then the project counter becomes 0

  Scenario: Reset only the active step counter when steps are configured
    Given a project has steps:
      | title | target_rows | current_rows |
      | Côtes | 20          | 10           |
      | Corps | 40          | 5            |
    And the active step is "Côtes"
    When I tap the reset button
    Then the active step counter becomes 0
    And the total project counter equals the sum of step counters
