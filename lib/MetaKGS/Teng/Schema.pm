package MetaKGS::Teng::Schema;
use strict;
use warnings;
use Teng::Schema::Declare;

base_row_class 'MetaKGS::Teng::Row';

table {
    name 'resources';
    pk 'uri';
    columns qw(
        uri
        request_date
        status_code
        response_date
        last_modified
        etag
        content
        insert_date
        update_date
    );
};

1;
