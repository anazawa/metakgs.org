package MetaKGS::Web::View::JSON::Top100;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;

sub show {
    my ( $class, $resource ) = @_;

    my %content = (
        players => [],
    );

    for my $player ( @{ $resource->{content}->{players} || [] } ) {
        push @{$content{players}}, {
            position     => $player->{position},
            name         => $player->{name},
            rank         => $player->{rank},
            archives_url => $class->uri_for( "api/archives/$player->{name}" ),
        };
    }

    my %body = (
        message      => 'OK',
        request_url  => $resource->{request_uri}->as_string,
        requested_at => $resource->{request_date}->datetime . 'Z',
        responded_at => $resource->{response_date}->datetime . 'Z',
        content      => \%content,
    );

    \%body;
}

1;
