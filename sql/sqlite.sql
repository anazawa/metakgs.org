CREATE TABLE resources (
        request_id TEXT
                   NOT NULL,
       request_uri TEXT
                   NOT NULL,
      request_date TEXT -- YYYY-MM-DD hh:mm:ss
                   NOT NULL,
       status_code TEXT -- 200, 301, 404, ...
                   DEFAULT "UNKNOWN"
                   NOT NULL,
     response_date TEXT -- YYYY-MM-DD hh:mm:ss
                   DEFAULT "UNKNOWN"
                   NOT NULL,
           content TEXT
                   DEFAULT "UNKNOWN"
                   NOT NULL,
        CONSTRAINT pk_resources
           PRIMARY KEY (request_id)
);
