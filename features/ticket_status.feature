Feature: Ticket Status Management
  As a user
  I want to change ticket statuses
  So that I can track progress on tasks

  Background:
    Given a clean tickets directory
    And a ticket exists with ID "test-0001" and title "Test ticket"

  Scenario: Set status to in_progress
    Given ticket "test-0001" has status "ready"
    When I run "ticket status test-0001 in_progress"
    Then the command should succeed
    And the output should be "Updated test-0001 -> in_progress"
    And ticket "test-0001" should have field "status" with value "in_progress"

  Scenario: Set status to closed
    When I run "ticket status test-0001 closed"
    Then the command should succeed
    And the output should be "Updated test-0001 -> closed"
    And ticket "test-0001" should have field "status" with value "closed"

  Scenario: Set status to open
    Given ticket "test-0001" has status "closed"
    When I run "ticket status test-0001 open"
    Then the command should succeed
    And the output should be "Updated test-0001 -> open"
    And ticket "test-0001" should have field "status" with value "open"

  Scenario: Start command sets status to in_progress
    Given ticket "test-0001" has status "ready"
    When I run "ticket start test-0001"
    Then the command should succeed
    And the output should be "Updated test-0001 -> in_progress"
    And ticket "test-0001" should have field "status" with value "in_progress"

  Scenario: Close command sets status to closed
    When I run "ticket close test-0001"
    Then the command should succeed
    And the output should be "Updated test-0001 -> closed"
    And ticket "test-0001" should have field "status" with value "closed"

  Scenario: Reopen command sets status to open
    Given ticket "test-0001" has status "closed"
    When I run "ticket reopen test-0001"
    Then the command should succeed
    And the output should be "Updated test-0001 -> open"
    And ticket "test-0001" should have field "status" with value "open"

  Scenario: Invalid status value
    When I run "ticket status test-0001 invalid"
    Then the command should fail
    And the output should contain "Error: invalid status 'invalid'"
    And the output should contain "open ready in_progress closed"

  Scenario: Open tickets require refinement before starting
    When I run "ticket start test-0001"
    Then the command should fail
    And the output should contain "set status to ready before starting"
    And ticket "test-0001" should have field "status" with value "open"

  Scenario: Set status to ready
    When I run "ticket status test-0001 ready"
    Then the command should succeed
    And ticket "test-0001" should have field "status" with value "ready"

  Scenario: Ready ticket with unfinished dependency cannot start
    Given a ticket exists with ID "test-0002" and title "Prerequisite"
    And ticket "test-0001" depends on "test-0002"
    And ticket "test-0001" has status "ready"
    When I run "ticket start test-0001"
    Then the command should fail
    And the output should contain "dependency 'test-0002' is not closed"
    And ticket "test-0001" should have field "status" with value "ready"

  Scenario: Status of non-existent ticket
    When I run "ticket status nonexistent open"
    Then the command should fail
    And the output should contain "Error: ticket 'nonexistent' not found"

  Scenario: Status command with partial ID
    Given ticket "test-0001" has status "ready"
    When I run "ticket status 0001 in_progress"
    Then the command should succeed
    And ticket "test-0001" should have field "status" with value "in_progress"
