package MetaKGS::Web::View::JSON::TournList;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;
use URI;

sub show {
    my ( $class, $args ) = @_;

    my %content = (
        tournaments => [],
        source_uri  => $args->{uri}->as_string,
        updated_at  => $args->{response_date}->strftime( '%Y-%m-%dT%H:%M%SZ' ),
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
