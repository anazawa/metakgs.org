package MetaKGS::Web::View::JSON::TournInfo;
use strict;
use warnings;
use parent qw/MetaKGS::Web::View::JSON/;
use HTML::WikiConverter;
use Text::Unidecode qw/unidecode/;

sub show {
    my ( $class, $args ) = @_;
    my %query = $args->{request_uri}->query_form;

    my $description = $args->{content}->{description};
       $description = $class->_html2markdown( $description );

    my %content = (
        id           => $query{id} + 0,
        name         => $args->{content}->{name},
        description  => $description,
        rounds       => [],
        entrants_url => $class->uri_for( "api/tournament/$query{id}/entrants" ),
    );

    for my $round ( @{ $args->{content}->{links}->{rounds} || [] } ) {
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
        message      => 'OK',
        content      => \%content,
        request_url  => $args->{request_uri}->as_string,
        responded_at => $args->{response_date}->datetime . 'Z',
        requested_at => $args->{request_date}->datetime . 'Z',
    );

    \%body;
}


sub _html2markdown {
    my $class = shift;
    my $html = unidecode shift; # XXX

    my $converter = HTML::WikiConverter->new(
        dialect     => 'Markdown',
        link_style  => 'inline',
        image_style => 'inline',
    );

    $converter->html2wiki( $html );
}

1;
