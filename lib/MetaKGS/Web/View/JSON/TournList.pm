package MetaKGS::Web::View::JSON::TournList;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;
use URI;
use Time::Piece qw/gmtime/;

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
        link         => $class->_link( $resource ),
        content      => \%content,
    );

    \%body;
}

sub _link {
    my ( $class, $resource ) = @_;
    my $year_index = $resource->{content}->{year_index};
    my %query = $resource->{request_uri}->query_form;
    my $now = gmtime;

    my %years = (
        first => $year_index->[0],
    );

    my $found = 0;
    for my $year ( @$year_index ) {
        next if !$found and $year->{year} != $query{year};
        next if !$found++;
        $years{next} = $year;
        last;
    }
    continue {
        $years{prev} = $year unless $found;
    }

    my %link = (
        first => undef,
        prev  => undef,
        next  => undef,
        last  => $class->uri_for( "/api/tournaments" ),
    );

    while ( my ($rel, $year) = each %years ) {
        $link{$rel} = $class->uri_for(
            $year->{year} == $now->year
                ? "/api/tournaments"
                : "/api/tournaments/$year->{year}"
        );
    }

    \%link;
}

1;
