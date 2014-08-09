package MetaKGS::WWW::GoKGS::Scraper::TournEntrants;
use strict;
use warnings;
use parent qw/WWW::GoKGS::Scraper::TournEntrants/;
use HTML::TreeBuilder::LibXML;

sub build_uri {
    my $class = shift;
    my %query = @_ == 1 ? %{$_[0]} : @_;

    my @q;
    for my $key (qw/id sort/) {
        push @q, $key, $query{$key} if exists $query{$key};
    }

    $class->SUPER::build_uri( @q );
}

sub init {
    my ( $self, $args ) = @_;

    $self->SUPER::init( $args );

    $self->_tree_builder_class( 'HTML::TreeBuilder::LibXML' );

    return;
}

sub scrape {
    my ( $self, @args ) = @_;
    my $result = $self->SUPER::scrape( @args );

    for my $entrant ( @{ $result->{entrants} || [] } ) {
        $entrant->{position} += 0 if exists $entrant->{position};
        $entrant->{score}    += 0 if exists $entrant->{score};
        $entrant->{sos}      += 0 if exists $entrant->{sos};
        $entrant->{sodos}    += 0 if exists $entrant->{sodos};
    }

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
