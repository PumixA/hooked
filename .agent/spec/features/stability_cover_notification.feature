Feature: Android stability, project cover, and lockscreen foundations
  In order to make Hooked reliable and more immersive
  As a crafter using the PWA on mobile
  I want robust routing/timer behavior, configurable project cover photos, and notification action foundations

  Scenario: Reloading a deep route on Android does not blank the app
    Given the app is installed as a PWA on Android
    And I am on project detail route "#/projects/<project-id>"
    When I reload the page
    Then the app renders normally on the same route
    And I do not see a blank screen

  Scenario: Timer remains accurate after device sleep
    Given a project timer is running
    When the device goes to sleep for several minutes
    And I reopen the app
    Then elapsed time is computed from system clock time
    And elapsed time includes the sleep interval correctly

  Scenario: Dashboard cover defaults to app logo
    Given a project has no custom cover photo
    When I open the dashboard
    Then the featured card displays the app logo

  Scenario: Dashboard cover uses a custom photo from project settings
    Given I open project settings
    When I upload a cover photo
    Then the project stores a local cover preview immediately
    And the dashboard featured card displays that custom cover

  Scenario: Removing a project cover returns to default logo
    Given a project has a custom cover photo
    When I remove the cover from project settings
    Then the project has no custom cover
    And the dashboard featured card displays the app logo again

  Scenario: Cover photo is synced when cloud sync is active
    Given cloud sync is enabled and online
    And a project cover is pending synchronization
    When synchronization runs
    Then the cover is uploaded to the backend
    And the project is marked with synchronized cover state

  Scenario: Lockscreen increment action foundation updates project counter
    Given the timer is active on a project
    And notification permission is granted
    When the service worker receives an increment action click
    Then the app receives "LOCKSCREEN_INCREMENT_ROW" for the target project
    And the project counter is incremented by one row
