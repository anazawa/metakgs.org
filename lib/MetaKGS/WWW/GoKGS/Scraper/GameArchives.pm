package MetaKGS::WWW::GoKGS::Scraper::GameArchives;
use strict;
use warnings;
use parent qw/WWW::GoKGS::Scraper::GameArchives/;
use HTML::TreeBuilder::LibXML;

sub build_uri {
    my $class = shift;
    my %query = @_ == 1 ? %{$_[0]} : @_;

    my @q;
    for my $key (qw/user year month oldAccounts/) {
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

    for my $game ( @{ $result->{games} || [] } ) {
        $game->{sgf_uri}    .= q{} if exists $game->{sgf_uri};
        $game->{board_size} += 0;
        $game->{handicap}   += 0 if exists $game->{handicap};

        for my $user (
            $game->{owner} || (),
            @{ $game->{black} || [] },
            @{ $game->{white} || [] },
        ) {
            $user->{uri} .= q{};
        }
    }

    $result->{tgz_uri} .= q{} if exists $result->{tgz_uri};
    $result->{zip_uri} .= q{} if exists $result->{zip_uri};

    for my $month ( @{ $result->{calendar} || [] } ) {
        $month->{year}  += 0;
        $month->{month} += 0;
        $month->{uri}   .= q{} if exists $month->{uri};
    }

    $result;
}

1;
