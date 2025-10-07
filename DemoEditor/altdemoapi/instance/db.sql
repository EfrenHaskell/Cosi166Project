CREATE OR REPLACE TABLE Student(
    id              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    first_name      VARCHAR(15),
    last_name       VARCHAR(15),
    email_address   VARCHAR(50) NOT NULL
);
