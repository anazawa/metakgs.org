package MetaKGS::WWW::GoKGS::Scraper::TournInfo;
use strict;
use warnings;
use parent qw/WWW::GoKGS::Scraper::TournInfo/;
use HTML::TreeBuilder::LibXML;

sub init {
    my ( $self, $args ) = @_;

    $self->SUPER::init( $args );

    $self->_tree_builder_class( 'HTML::TreeBuilder::LibXML' );

    return;
}

sub scrape {
    my ( $self, @args ) = @_;
    my $result = $self->SUPER::scrape( @args );

    for my $round ( @{ $result->{links}->{rounds} || [] } ) {
        $round->{round} += 0;
        $round->{uri}   .= q{} if exists $round->{uri};
    }

    for my $entrants ( @{ $result->{links}->{entrants} || [] } ) {
        $entrants->{uri} .= q{};
    }

    $result;
}

1;
