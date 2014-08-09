package MetaKGS::Web::View::JSON::GameArchives;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;

sub show {
    my ( $class, $resource ) = @_;

    my %content = (
        games   => [],
        tgz_url => $resource->{content}->{tgz_uri},
        zip_url => $resource->{content}->{zip_uri},
    );

    for my $game ( @{ $resource->{content}->{games} || [] } ) {
        my $owner = $game->{owner} && $class->_user( $game->{owner} );
        my @white = map { $class->_user($_) } @{ $game->{white} || [] };
        my @black = map { $class->_user($_) } @{ $game->{black} || [] };

        push @{$content{games}}, {
            sgf_url    => $game->{sgf_uri},
            owner      => $owner,
            white      => \@white,
            black      => \@black,
            board_size => $game->{board_size},
            handicap   => $game->{handicap},
            started_at => $game->{start_time} . 'Z',
            type       => $game->{type},
            result     => $game->{result},
        };
    }

    my %body = (
        content      => \%content,
        request_url  => $resource->{request_uri}->as_string,
        requested_at => $resource->{request_date}->datetime . 'Z',
        responded_at => $resource->{response_date}->datetime . 'Z',
        message      => 'OK',
    );

    \%body;
}

sub _user {
    my ( $class, $args ) = @_;

    my %user = (
        name => $args->{name},
        rank => $args->{rank},
        archives_url => $class->uri_for( "api/archives/$args->{name}" ),
    );

    \%user;
}

1;
