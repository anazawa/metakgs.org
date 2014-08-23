package MetaKGS::Web::View::JSON::TournEntrants;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;

sub show {
    my ( $class, $args ) = @_;
    my %query = $args->{request_uri}->query_form;

    my %content = (
        id       => $query{id} + 0,
        name     => $args->{content}->{name},
        rounds   => [],
        entrants => [],
        entrants_url => $class->uri_for( "api/tournament/$query{id}/entrants" ),
    );

    for my $entrant ( @{ $args->{content}->{entrants} || [] } ) {
        push @{$content{entrants}}, {
            position => $entrant->{position},
            name     => $entrant->{name},
            rank     => $entrant->{rank},
            score    => $entrant->{score},
            sos      => $entrant->{sos},
            sodos    => $entrant->{sodos},
            notes    => $entrant->{standing} || $entrant->{notes},
            archives_url => $class->uri_for( "api/archives/$entrant->{name}" ),
        },
    }

    for my $round ( @{ $args->{content}->{links}->{rounds} || [] } ) {
        my $url = "api/tournament/$query{id}/round/$round->{round}";
           $url = $class->uri_for( $url );

        push @{$content{rounds}}, {
            round    => $round->{round} + 0,
            url      => $round->{uri} && $url,
            start_at => $round->{start_time} . 'Z',
            end_at   => $round->{end_time} && $round->{end_time} . 'Z',
        };
    }

    my %body = (
        content      => \%content,
        request_url  => $args->{request_uri}->as_string,
        responded_at => $args->{response_date}->datetime . 'Z',
        requested_at => $args->{request_date}->datetime . 'Z',
        message      => 'OK',
    );

    \%body;
}

1;
