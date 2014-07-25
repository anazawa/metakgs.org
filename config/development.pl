use File::Spec;
use File::Basename qw(dirname);

my $basedir = File::Spec->rel2abs(File::Spec->catdir(dirname(__FILE__), '..'));
my $dbpath = File::Spec->catfile($basedir, 'db', 'development.db');

+{
    'DBI' => [
        "dbi:SQLite:dbname=$dbpath", '', '',
        +{
            sqlite_unicode => 1,
        }
    ],
    'MetaKGS::Web' => {
        upstream => 'http://localhost:5001/',
    },
    'MetaKGS::Upstream' => {
        timeout => 10,
        delay => 5,
    },
};
