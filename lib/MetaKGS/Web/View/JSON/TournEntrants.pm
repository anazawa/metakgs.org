package MetaKGS::Web::View::JSON::TournEntrants;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;

sub show {
    my ( $class, $args ) = @_;
    my %query = $args->{uri}->query_form;

    my %tournament = (
        id       => $query{id} + 0,
        name     => $args->{content}->{name},
        rounds   => [],
        entrants => [],
        entrants_url => $class->uri_for( "api/tournament/$query{id}/entrants" ),
    );

    my %content = (
        tournament => \%tournament,
        source_url => $args->{uri}->as_string,
        updated_at => $args->{response_date}->strftime( '%Y-%m-%dT%H:%M:%SZ' ),
    );

    for my $entrant ( @{ $args->{content}->{entrants} || [] } ) {
        push @{$tournament{entrants}}, {
            position  => $entrant->{position},
            name      => $entrant->{name},
            rank      => $entrant->{rank},
            score     => $entrant->{score},
            sos       => $entrant->{sos},
            sodos     => $entrant->{sodos},
            notes     => $entrant->{standing} || $entrant->{notes},
            games_url => $class->uri_for( "api/games/$entrant->{name}" ),
        },
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

1;
