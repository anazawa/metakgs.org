package MetaKGS::FormValidator::Constraints;
use strict;
use warnings;
use Exporter qw/import/;
use List::MoreUtils qw/uniq/;

our @EXPORT_OK = qw(
    game_slug
);

sub game_slug {
    sub {
        my $slug = $_[1];

        my $users = $slug;
           $users =~ s/-\d+$//;
           $users = [ map { lc } split(/-/, $slug) ];

        my $is_matched = $slug =~ m{^
            [a-z][a-z0-9]{0,9}
            (?:
                -[a-z][a-z0-9]{0,9}        # "foo-bar"
              | (?:-[2-9]|-[1-9]\d+)?      # "foo", "foo-2", ...
              | (?:-[a-z][a-z0-9]{0,9}){3} # "foo-bar-baz-qux"
            )
        $}xi;

        $is_matched && @$users == uniq @$users;
    };
}

1;
