package MetaKGS::Web::View::JSON::GameArchives;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;
use Time::Piece qw/gmtime/;

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
        message      => 'OK',
        request_url  => $resource->{request_uri}->as_string,
        requested_at => $resource->{request_date}->datetime . 'Z',
        responded_at => $resource->{response_date}->datetime . 'Z',
        content      => \%content,
        link         => $class->_link( $resource ),
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

sub _link {
    my ( $class, $resource ) = @_;
    my $calendar = $resource->{content}->{calendar};
    my %query = $resource->{request_uri}->query_form;
    my $now = gmtime;
 
    my %months = (
        first => $calendar->[0],
    );

    my $found = 0;
    for my $month ( @$calendar ) {
        next if !$found and $month->{year} != $query{year};
        next if !$found and $month->{month} != $query{month};
        next if !$found++;
        $months{next} = $month;
        last;
    }
    continue {
        $months{prev} = $month unless $found;
    }

    my %link = (
        first => undef,
        prev  => undef,
        next  => undef,
        last  => $class->uri_for( "/api/archives/$query{user}" ),
    );

    while ( my ($rel, $q) = each %months ) {
        $link{$rel} = $class->uri_for(
            $q->{year} == $now->year && $q->{month} == $now->mon
                ? "/api/archives/$query{user}"
                : "/api/archives/$query{user}/$q->{year}/$q->{month}"
        );
    }

    \%link;
}

1;
