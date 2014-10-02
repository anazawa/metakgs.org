package MetaKGS::Web::Response;
use strict;
use warnings;
use parent qw/Amon2::Web::Response/;
use HTTP::Headers::Util qw/join_header_words/;

sub push_link_header {
    my ( $self, $href, @params ) = @_;
    my $link = join_header_words([ "<$href>", undef, @params ]);
    $self->headers->push_header( 'Link' => $link );
}

sub retry_after { shift->headers->_date_header( 'Retry-After', @_ ) }

1;
