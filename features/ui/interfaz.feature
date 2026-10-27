# language: en
@ui
Feature: Book catalog in the browser
  As a BookStore user
  I want to manage books on the website
  So that I can check that the interface and API show the same data

  @smoke
  Scenario: U01 Login through the real form
    Given a new user registered through the API
    When I log in through the web interface
    Then I see my name and email in the catalog

  Scenario: U02 The interface reports an incorrect password
    Given a new user registered through the API
    When I try to log in through the web interface with the wrong password
    Then I see the credentials error and remain on the login page

  Scenario: U03 Register through the interface and log in
    When I register my user through the web interface
    And I log in through the web interface
    Then I see my name and email in the catalog

  Scenario: U04 The catalog redirects unauthenticated users to login
    When I open the catalog without logging in
    Then I am on the login page

  @smoke
  Scenario: U05 A book created through the API appears in web search
    Given a user authenticated through the API
    And my own book created through the API
    When I log in through the web interface
    And I search for my book by ISBN
    Then only my book appears with its saved details

  Scenario: U06 A book created on the website is saved in the API
    Given a new user registered through the API
    And a session started through the web interface
    When I create my book through the web interface
    Then the API returns the same book details

  Scenario: U07 Edits made on the website persist in the API
    Given a user authenticated through the API
    And my own book created through the API
    And a session started through the web interface
    When I change the title and price through the web interface
    Then the API returns the same book details

  Scenario: U08 Canceling deletion keeps the book and confirming it removes it
    Given a user authenticated through the API
    And my own book created through the API
    And a session started through the web interface
    When I cancel deletion through the web interface
    Then the API returns the same book details
    When I confirm deletion through the web interface
    Then the book disappears from the website and the API

  Scenario: U09 Logout prevents returning to the catalog
    Given a new user registered through the API
    And a session started through the web interface
    When I log out through the web interface
    And I reopen the catalog
    Then I am on the login page
    And the web session token no longer accesses the API

  Scenario: U10 Registration warns when passwords do not match
    When I try to register with two different passwords
    Then I see the confirmation error and remain on the registration page

  Scenario: U11 Search shows a message when no books match
    Given a user authenticated through the API
    And a session started through the web interface
    When I search for an ISBN that does not exist
    Then the catalog shows no matching books

  Scenario: U12 Canceling an edit preserves the original book
    Given a user authenticated through the API
    And my own book created through the API
    And a session started through the web interface
    When I change the title and cancel the edit
    Then the book keeps its original details on the website and in the API