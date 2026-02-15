Feature: inventory material descriptifs and project material management

  Background:
    Given the user is authenticated
    And the app runs offline-first

  Scenario: create a material with optional descriptif
    When the user creates a material with description, color_number, yardage_meters, and grammage_grams
    Then the material is saved in local IndexedDB
    And the material card shows the optional descriptif when present

  Scenario: edit a material descriptif
    Given an existing material in the inventory
    When the user edits its description, color_number, yardage_meters, or grammage_grams
    Then the changes are saved locally
    And the material is marked as pending for sync when cloud sync is enabled

  Scenario: project displays only associated materials by default
    Given a project has materials associated
    When the user opens the project materials view
    Then only the associated materials are displayed
    And the user can open a manage menu to add or remove associated materials

  Scenario: manage menu updates project material ids
    Given the user is in the project manage materials menu
    When the user selects or unselects materials from their inventory
    And the user saves
    Then the project's material_ids are updated locally
    And the change is queued for sync when cloud sync is enabled
