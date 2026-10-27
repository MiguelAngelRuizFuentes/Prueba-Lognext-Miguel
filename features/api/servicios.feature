# language: en
@api
Feature: BookStore API
  As a BookStore API client
  I want to manage my session and the book catalog
  So that I can use the service without the web interface

  @smoke
  Scenario: A01 The API and database are available
    When I check the service health
    Then the service reports that the database is available

  @smoke
  Scenario: A02 Registration, login and profile retrieval
    Given a new user registered through the API
    When I log in through the API
    Then the session and profile match their schemas without exposing the password

  Scenario: A03 The same email cannot be registered twice
    Given a new user registered through the API
    When I register the same user again
    Then I receive status 409 with code "EMAIL_ALREADY_REGISTERED"

  Scenario Outline: A04-A06 Registration rejects an invalid <field>
    When I register a user with invalid "<field>"
    Then I receive status 400 with code "VALIDATION_ERROR"
    And the error identifies field "<field>"
    Examples:
      | field    |
      | name     |
      | email    |
      | password |

  Scenario: A07 A user cannot log in with the wrong password
    Given a new user registered through the API
    When I log in through the API with the wrong password
    Then I receive status 401 with code "INVALID_CREDENTIALS"

  Scenario: A08 Login requires a password
    When I submit a login without a password
    Then I receive status 400 with code "VALIDATION_ERROR"
    And the error identifies field "password"

  Scenario: A09 The book catalog requires authentication
    When I request the books without a token
    Then I receive status 401 with code "TOKEN_MISSING"

  Scenario: A10 A tampered token cannot access the books
    When I request the books with an invalid token
    Then I receive status 401 with code "TOKEN_INVALID"

  Scenario: A11 Logout invalidates the token
    Given a user authenticated through the API
    When I log out and reuse the token
    Then I receive status 401 with code "SESSION_INVALIDATED"

  Scenario: A12 A second login invalidates the previous session
    Given a user authenticated through the API
    When I start a second session and use the first token
    Then I receive status 401 with code "SESSION_INVALIDATED"
    And the second session still works

  @smoke
  Scenario: A13 Complete book lifecycle with a partial update
    Given a user authenticated through the API
    When I create my own book through the API
    Then I can find it by ID and in the book list
    When I update only its title and price
    Then the changes persist and the other fields stay the same
    When I delete the book through the API
    Then deletion returns an empty 204 response and the book no longer exists

  Scenario Outline: A14-A16 Book creation validates <field>
    Given a user authenticated through the API
    When I create a book with invalid "<field>"
    Then I receive status 400 with code "VALIDATION_ERROR"
    And the error identifies field "<field>"
    Examples:
      | field         |
      | isbn          |
      | publishedYear |
      | price         |

  Scenario: A17 An ISBN cannot be used twice
    Given a user authenticated through the API
    And my own book created through the API
    When I try to create another book with the same ISBN
    Then I receive status 409 with code "DUPLICATE_ISBN"

  Scenario Outline: A18-A19 Book lookup distinguishes a <kind> identifier
    Given a user authenticated through the API
    When I request a "<kind>" book identifier
    Then I receive status <status> with code "<code>"
    Examples:
      | kind      | status | code           |
      | malformed | 400    | INVALID_ID     |
      | missing   | 404    | BOOK_NOT_FOUND |

  @book_contract
  Scenario: A20 The book identifier matches the published contract
    Given a user authenticated through the API
    And my own book created through the API
    Then Swagger requires bookId and the response includes it

  @book_contract
  Scenario: A21 The book price matches the published contract
    Given a user authenticated through the API
    And my own book created through the API
    Then Swagger defines price as text and the response has two decimals