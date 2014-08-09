package MetaKGS::Web::View::JSON::TournGames;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;

sub show {
    my ( $class, $resource ) = @_;
    my %query = $resource->{request_uri}->query_form;

    my %content = (
        id     => $query{id} + 0,
        name   => $resource->{content}->{name},
        round  => $resource->{content}->{round},
        games  => [],
        byes   => [],
        rounds => [],
        entrants_url => $class->uri_for( "api/tournament/$query{id}/entrants" ),
    );

    for my $game ( @{ $resource->{content}->{games} || [] } ) {
        push @{$content{games}}, {
            sgf_url    => $game->{sgf_uri},
            white      => $class->_user( $game->{white} ),
            black      => $class->_user( $game->{black} ),
            board_size => $game->{board_size},
            start_at   => $game->{start_time} . 'Z',
        };
    }

    for my $bye ( @{ $resource->{content}->{byes} || [] } ) {
        push @{$content{byes}}, $class->_user( $bye );
    }

    for my $round ( @{ $resource->{content}->{links}->{rounds} || [] } ) {
        my $url = "api/tournament/$query{id}/round/$round->{round}";
           $url = $class->uri_for( $url );

        push @{$content{rounds}}, {
            round    => $round->{round} + 0,
            url      => $url,
            start_at => $round->{start_time} . 'Z',
            end_at   => $round->{end_time} && $round->{end_time} . 'Z',
        };
    }

    my %body = (
        content      => \%content,
        request_url  => $resource->{request_uri}->as_string,
        responded_at => $resource->{response_date}->datetime . 'Z',
        requested_at => $resource->{request_date}->datetime . 'Z',
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

    $user{type} = $args->{type} if exists $args->{type};

    \%user;
}

1;
