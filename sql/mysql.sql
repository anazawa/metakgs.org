CREATE TABLE resources (
        request_id VARCHAR(255)
                   NOT NULL,
       request_uri VARCHAR(255)
                   NOT NULL,
      request_date VARCHAR(20) -- YYYY-MM-DD hh:mm:ss
                   NOT NULL,
       status_code VARCHAR(20) -- 200, 301, 404, ...
                   DEFAULT "UNKNOWN"
                   NOT NULL,
     response_date VARCHAR(20) -- YYYY-MM-DD hh:mm:ss
                   DEFAULT "UNKNOWN"
                   NOT NULL,
           content MEDIUMTEXT,
        CONSTRAINT pk_resources
           PRIMARY KEY (request_id)
);
