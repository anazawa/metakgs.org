package MetaKGS::Web::View::JSON::TournList;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;
use URI;

sub show {
    my ( $class, $resource ) = @_;

    my %content = (
        tournaments => [],
    );

    for my $tournament ( @{ $resource->{content}->{tournaments} || [] } ) {
        my %query = URI->new( $tournament->{uri} )->query_form;

        push @{$content{tournaments}}, {
            id    => $query{id} + 0,
            name  => $tournament->{name},
            notes => $tournament->{notes},
            url   => $class->uri_for( "api/tournament/$query{id}" ),
        };
    }

    my %body = (
        message      => 'OK',
        request_url  => $resource->{request_uri}->as_string,
        responded_at => $resource->{response_date}->datetime . 'Z',
        requested_at => $resource->{request_date}->datetime . 'Z',
        content      => \%content,
    );

    \%body;
}

1;
