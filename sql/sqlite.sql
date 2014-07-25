CREATE TABLE resources (
              uri TEXT
                  NOT NULL,
     request_date TEXT -- YYYY-MM-DD hh:mm:ss
                  NOT NULL,
      status_code TEXT -- 200, 301, 404, ...
                  NOT NULL,
    response_date TEXT -- YYYY-MM-DD hh:mm:ss
                  DEFAULT "{unknown}"
                  NOT NULL,
          content TEXT
                  DEFAULT "{n/a}"
                  NOT NULL,
       CONSTRAINT pk_resources
          PRIMARY KEY (uri, request_date)
/*
       CONSTRAINT valid_response_date
            CHECK (response_date IN ("{unknown}", "{n/a}")
                      OR response_date >= request_date)
*/
);
