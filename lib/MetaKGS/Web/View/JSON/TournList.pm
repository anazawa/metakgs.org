package MetaKGS::Web::View::JSON::TournList;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;
use URI;

sub show {
    my ( $class, $args ) = @_;

    my %content = (
        tournaments  => [],
        source_url   => $args->{request_uri}->as_string,
        responded_at => $args->{response_date}->datetime . 'Z',
        requested_at => $args->{request_date}->datetime . 'Z',
    );

    for my $tournament ( @{ $args->{content}->{tournaments} || [] } ) {
        my %query = URI->new( $tournament->{uri} )->query_form;

        push @{$content{tournaments}}, {
            id   => $query{id} + 0,
            name => $tournament->{name},
            url  => $class->uri_for( "api/tournament/$query{id}" ),
        };
    }

    \%content;
}

1;
