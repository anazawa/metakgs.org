CREATE TABLE resources (
              uri TEXT
                  NOT NULL,
     request_date TEXT -- YYYY-MM-DD hh:mm:ss
                  NOT NULL,
      status_code TEXT -- 200, 301, 404, ...
                  DEFAULT "{unknown}"
                  NOT NULL,
    response_date TEXT -- YYYY-MM-DD hh:mm:ss
                  DEFAULT "{unknown}"
                  NOT NULL,
    last_modified TEXT -- YYYY-MM-DD hh:mm:ss
                  DEFAULT "{unknown}"
                  NOT NULL,
             etag TEXT
                  DEFAULT "{unknown}"
                  NOT NULL,
          content TEXT -- JSON
                  DEFAULT "{n/a}"
                  NOT NULL,
      insert_date TEXT -- YYYY-MM-DD hh:mm:ss
                  NOT NULL,
      update_date TEXT -- YYYY-MM-DD hh:mm:ss
                  NOT NULL,
       CONSTRAINT pk_resources
          PRIMARY KEY (uri),
       CONSTRAINT valid_update_date
            CHECK (update_date >= insert_date),
       CONSTRAINT valid_response_date
            CHECK (response_date = "{unknown}"
                      OR response_date >= request_date)
);
