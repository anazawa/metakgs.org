use strict;
use warnings;
use File::Spec;
use File::Basename qw/dirname/;

my $basedir = File::Spec->catdir( dirname(__FILE__), '..' );
   $basedir = File::Spec->rel2abs( $basedir );

my $dbpath = File::Spec->catfile( $basedir, 'db', 'development.db' );

+{
    'MetaKGS' => {
        teng => {
            connect_info => [
                "dbi:SQLite:dbname=$dbpath", '', '',
                +{
                    sqlite_unicode => 1,
                }
            ],
        },
    },
    'MetaKGS::Web' => {
        upstream_uri => 'http://localhost:5001/',
        user_agent => {
            from => 'anazawa@cpan.org',
        },
    },
    'MetaKGS::Upstream' => {
        delay => 1.0,
        user_agent => {
            timeout => 10,
        },
    },
    'TheSchwartz' => [
        "dbi:SQLite:dbname=$dbpath", '', '',
        +{
            sqlite_unicode => 1,
            RaiseError => 1,
            PrintError => 0,
            AutoCommit => 1,
        }
    ],
};
