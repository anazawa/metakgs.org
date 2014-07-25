package MetaKGS::Web::View::JSON::TournGames;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;

sub show {
    my ( $class, $args ) = @_;
    my %query = $args->{uri}->query_form;

    my %tournament = (
        id     => $query{id} + 0,
        name   => $args->{content}->{name},
        round  => $args->{content}->{round},
        games  => [],
        byes   => [],
        rounds => [],
        entrants_url => $class->uri_for( "api/tournament/$query{id}/entrants" ),
    );

    my %content = (
        tournament => \%tournament,
        source_url => $args->{uri}->as_string,
        updated_at => $args->{response_date}->strftime( '%Y-%m-%dT%H:%M:%SZ' ),
    );

    for my $game ( @{ $args->{content}->{games} || [] } ) {
        push @{$tournament{games}}, {
            sgf_url    => $game->{sgf_uri},
            white      => $class->_user( $game->{white} ),
            black      => $class->_user( $game->{black} ),
            board_size => $game->{board_size},
            start_at   => $game->{start_time} . 'Z',
        };
    }

    for my $bye ( @{ $args->{content}->{byes} || [] } ) {
        push @{$tournament{byes}}, $class->_user( $bye );
    }

    for my $round ( @{ $args->{content}->{links}->{rounds} || [] } ) {
        my $url = "api/tournament/$query{id}/round/$round->{round}";
           $url = $class->uri_for( $url );

        push @{$tournament{rounds}}, {
            round    => $round->{round} + 0,
            url      => $url,
            start_at => $round->{start_time} . 'Z',
            end_at   => $round->{end_time} && $round->{end_time} . 'Z',
        };
    }

    \%content;
}

sub _user {
    my ( $class, $args ) = @_;

    my %user = (
        name => $args->{name},
        rank => $args->{rank},
        games_url => $class->uri_for( "api/games/$args->{name}" ),
    );

    $user{type} = $args->{type} if exists $args->{type};

    \%user;
}

1;
