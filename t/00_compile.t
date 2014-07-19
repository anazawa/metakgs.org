use strict;
use warnings;
use Test::More tests => 7;

BEGIN {
    use_ok 'MetaKGS';
    use_ok 'MetaKGS::Web';
    use_ok 'MetaKGS::Web::View';
    use_ok 'MetaKGS::Web::ViewFunctions';

    use_ok 'MetaKGS::Teng::Schema';
    use_ok 'MetaKGS::Web::Dispatcher';

    use_ok 'MetaKGS::Model::Resources';
}
